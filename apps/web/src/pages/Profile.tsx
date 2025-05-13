import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/use-toast";

const Profile = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await api.post(`/auth/me`);
                setUserData(response.data);
            } catch (error) {
                setError(error.message);
            }
        };

        fetchUserData();
    }, [user?.id]);

    if (isLoading) {
        return <div>Loading...</div>;
    }
};

export default Profile;
